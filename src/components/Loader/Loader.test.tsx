import { render, screen } from '@testing-library/react'
import Loader from './Loader'

describe('Loader | component | unit test', () => {
  it('should render with success', () => {
    render(<Loader>Loader</Loader>)

    expect(screen.getByText('Loader')).toBeInTheDocument()
  })
})
