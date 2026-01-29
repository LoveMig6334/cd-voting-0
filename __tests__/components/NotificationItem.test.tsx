import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationItem } from "@/components/admin/NotificationItem";
import { ActivityDisplayItem } from "@/lib/db";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockActivity: ActivityDisplayItem = {
  id: 1,
  icon: "how_to_vote",
  iconBg: "bg-emerald-500",
  iconColor: "text-emerald-500",
  title: "นักเรียนลงคะแนน",
  description: "สมชาย ใจดี (ม.3/1) ลงคะแนนเลือกตั้ง",
  time: "2 นาที",
};

describe("NotificationItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders minimized view with title and time", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    expect(screen.getByText("นักเรียนลงคะแนน")).toBeInTheDocument();
    expect(screen.getByText("2 นาที")).toBeInTheDocument();
  });

  it("renders description (initially hidden)", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    // Description exists in DOM but hidden with opacity-0
    const description = screen.getByText(/สมชาย ใจดี/);
    expect(description).toBeInTheDocument();
    expect(description.parentElement).toHaveClass("opacity-0");
  });

  it("shows description on hover", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    const item = screen.getByText("นักเรียนลงคะแนน").closest("div[class*='cursor-pointer']");
    expect(item).toBeInTheDocument();

    fireEvent.mouseEnter(item!);

    const descriptionContainer = screen.getByText(/สมชาย ใจดี/).parentElement;
    expect(descriptionContainer).toHaveClass("opacity-100");
  });

  it("hides description on mouse leave", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    const item = screen.getByText("นักเรียนลงคะแนน").closest("div[class*='cursor-pointer']");

    // Hover
    fireEvent.mouseEnter(item!);
    const descriptionContainer = screen.getByText(/สมชาย ใจดี/).parentElement;
    expect(descriptionContainer).toHaveClass("opacity-100");

    // Leave
    fireEvent.mouseLeave(item!);
    expect(descriptionContainer).toHaveClass("opacity-0");
  });

  it("calls onNavigate and navigates to /admin/activity on click", () => {
    const mockOnNavigate = jest.fn();
    render(<NotificationItem activity={mockActivity} onNavigate={mockOnNavigate} />);

    const item = screen.getByText("นักเรียนลงคะแนน").closest("div[class*='cursor-pointer']");
    fireEvent.click(item!);

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/admin/activity");
  });

  it("renders glowing dot with correct background color", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    // Find the dot element by checking for the iconBg class
    const container = screen.getByText("นักเรียนลงคะแนน").closest("div[class*='cursor-pointer']");
    const dot = container?.querySelector(".bg-emerald-500");
    expect(dot).toBeInTheDocument();
  });

  it("shows chevron arrow on hover", () => {
    render(<NotificationItem activity={mockActivity} onNavigate={jest.fn()} />);

    const item = screen.getByText("นักเรียนลงคะแนน").closest("div[class*='cursor-pointer']");
    const chevron = screen.getByText("chevron_right");

    // Initially hidden
    expect(chevron).toHaveClass("opacity-0");

    // Hover to show
    fireEvent.mouseEnter(item!);
    expect(chevron).toHaveClass("opacity-100");
  });
});
