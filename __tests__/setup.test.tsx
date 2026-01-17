import { render, screen } from "@testing-library/react";

// Simple test to verify Jest + React Testing Library setup works
describe("Test Framework Setup", () => {
  it("should render a simple component", () => {
    const TestComponent = () => <div data-testid="test">Hello Test</div>;

    render(<TestComponent />);

    expect(screen.getByTestId("test")).toBeInTheDocument();
    expect(screen.getByText("Hello Test")).toBeInTheDocument();
  });

  it("should have working Jest matchers", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect([1, 2, 3]).toContain(2);
  });
});
