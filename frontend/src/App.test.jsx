import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/Monopereo Frontend/i);
    expect(headingElement).toBeInTheDocument();
  });
});
