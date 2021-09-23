import { useContext } from 'react'
import { Route, Redirect, RouteProps } from 'react-router-dom'

import { AuthContext } from '../context/AuthContext'
import { validateUserPermissions } from '../utils/validateUserPermissions'

interface IPrivateRouteProps extends RouteProps {
  permissions?: string[]
  roles?: string[]
}

export const PrivateRoute = ({ permissions, roles, ...rest }: IPrivateRouteProps) => {
  const { isAuthenticated, user } = useContext(AuthContext)
  const { hasAllPermissions, hasAllRoles } = validateUserPermissions({ user, permissions, roles })

  return isAuthenticated && hasAllPermissions && hasAllRoles
    ? (<Route {...rest} />)
    : (<Redirect to={{ pathname: '/login', state: { from: rest.location } }} />)
}
