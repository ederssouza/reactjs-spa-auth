import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { destroyCookie, parseCookies, setCookie } from 'nookies'

import { COOKIE_EXPIRATION_TIME, REFRESH_TOKEN_COOKIE, TOKEN_COOKIE } from '../utils/constants'

interface IFailedRequestQueue {
  onSuccess: (token: string) => void
  onFailure: (error: AxiosError) => void
}

let isRefreshing = false
let failedRequestQueue: IFailedRequestQueue[] = []

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
})

export function setHeaderAuthorization (request: AxiosRequestConfig, token: string) {
  request.headers.Authorization = `Bearer ${token}`
}

api.interceptors.request.use(request => {
  const cookies = parseCookies()
  const token = cookies[TOKEN_COOKIE]
  if (token) setHeaderAuthorization(request, token)
  return request
}, (error) => {
  return Promise.reject(error)
})

api.interceptors.response.use(response => {
  return response
}, (error) => {
  if (error?.response?.status === 401) {
    if (error.response.data?.code === 'token.expired') {
      const originalConfig = error.config
      const cookies = parseCookies()
      const refreshToken = cookies[REFRESH_TOKEN_COOKIE]

      // prevent a new request with old token
      if (!isRefreshing) {
        isRefreshing = true

        api.post('/refresh', { refreshToken })
          .then(response => {
            const { token } = response.data

            setCookie(null, TOKEN_COOKIE, token, {
              maxAge: COOKIE_EXPIRATION_TIME,
              path: '/'
            })

            setCookie(null, REFRESH_TOKEN_COOKIE, response.data.refreshToken, {
              maxAge: COOKIE_EXPIRATION_TIME,
              path: '/'
            })

            // force set token
            setHeaderAuthorization(api.defaults, token)

            // calls the `onSuccess` method on the failed with list
            failedRequestQueue.forEach(request => request.onSuccess(token))
            failedRequestQueue = []
          })
          .catch(error => {
            // calls the `onFailure` method on the failed with list
            failedRequestQueue.forEach(request => request.onFailure(error))
            failedRequestQueue = []

            destroyCookie(null, TOKEN_COOKIE)
            destroyCookie(null, REFRESH_TOKEN_COOKIE)
          })
          .finally(() => {
            isRefreshing = false
          })
      }

      // create a request list to reprocess
      return new Promise((resolve, reject) => {
        failedRequestQueue.push({
          onSuccess: (token: string) => {
            setHeaderAuthorization(originalConfig, token)
            resolve(api(originalConfig))
          },
          onFailure: (error: AxiosError) => {
            reject(error)
          }
        })
      })
    } else {
      destroyCookie(null, TOKEN_COOKIE)
      destroyCookie(null, REFRESH_TOKEN_COOKIE)
    }
  }

  return Promise.reject(error)
})
