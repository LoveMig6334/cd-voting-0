import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

// Test component that uses the hook
function TestComponent({ onClickOutside }: { onClickOutside: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(
    ref,
    () => {
      onClickOutside();
      setIsOpen(false);
    },
    isOpen
  );

  return (
    <div>
      <div data-testid="outside">Outside Element</div>
      {isOpen && (
        <div ref={ref} data-testid="dropdown">
          <button data-testid="inside-button">Inside Button</button>
          Dropdown Content
        </div>
      )}
    </div>
  );
}

// Test component with disabled hook
function TestComponentDisabled({
  onClickOutside,
  enabled,
}: {
  onClickOutside: () => void;
  enabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, onClickOutside, enabled);

  return (
    <div>
      <div data-testid="outside">Outside Element</div>
      <div ref={ref} data-testid="dropdown">
        Dropdown Content
      </div>
    </div>
  );
}

describe("useClickOutside", () => {
  it("calls handler when clicking outside the ref element", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(handleClickOutside).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when clicking inside the ref element", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    fireEvent.mouseDown(screen.getByTestId("dropdown"));

    expect(handleClickOutside).not.toHaveBeenCalled();
  });

  it("does not call handler when clicking inside child elements", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    fireEvent.mouseDown(screen.getByTestId("inside-button"));

    expect(handleClickOutside).not.toHaveBeenCalled();
  });

  it("does not call handler when disabled", () => {
    const handleClickOutside = jest.fn();
    render(
      <TestComponentDisabled onClickOutside={handleClickOutside} enabled={false} />
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(handleClickOutside).not.toHaveBeenCalled();
  });

  it("calls handler when enabled is true", () => {
    const handleClickOutside = jest.fn();
    render(
      <TestComponentDisabled onClickOutside={handleClickOutside} enabled={true} />
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(handleClickOutside).toHaveBeenCalledTimes(1);
  });

  it("responds to touch events", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    fireEvent.touchStart(screen.getByTestId("outside"));

    expect(handleClickOutside).toHaveBeenCalledTimes(1);
  });

  it("does not respond to touch inside the ref element", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    fireEvent.touchStart(screen.getByTestId("dropdown"));

    expect(handleClickOutside).not.toHaveBeenCalled();
  });

  it("closes dropdown when clicking outside", () => {
    const handleClickOutside = jest.fn();
    render(<TestComponent onClickOutside={handleClickOutside} />);

    // Dropdown should be visible initially
    expect(screen.getByTestId("dropdown")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));

    // Dropdown should be removed from DOM
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });
});
