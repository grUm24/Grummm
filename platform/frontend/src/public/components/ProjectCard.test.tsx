import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectCard } from "./ProjectCard";
import type { PortfolioProject } from "../types";

const project: PortfolioProject = {
  id: "task-tracker",
  title: { en: "Task Tracker", ru: "Трекер задач" },
  summary: { en: "Summary", ru: "Описание" },
  description: { en: "Long description", ru: "Детальное описание" },
  tags: ["React"],
  heroImage: { light: "light.png", dark: "dark.png" },
  screenshots: [{ light: "s1.png", dark: "s1d.png" }]
};

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches,
      media: "",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    })
  });
}

describe("ProjectCard", () => {
  test("desktop hover expands and click navigates", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    const onExpand = jest.fn();

    render(
      <ProjectCard
        project={project}
        theme="light"
        language="en"
        isExpanded={false}
        onExpand={onExpand}
        onCollapse={() => undefined}
        onNavigate={onNavigate}
      />
    );

    const card = screen.getByRole("button", { name: "Task Tracker" });
    await user.hover(card);
    expect(onExpand).toHaveBeenCalledWith("task-tracker");

    await user.click(card);
    expect(onNavigate).toHaveBeenCalledWith("task-tracker");
  });

  test("mobile first tap expands and second tap navigates", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    const onExpand = jest.fn();

    const { rerender } = render(
      <ProjectCard
        project={project}
        theme="light"
        language="en"
        isExpanded={false}
        onExpand={onExpand}
        onCollapse={() => undefined}
        onNavigate={onNavigate}
      />
    );

    const card = screen.getByRole("button", { name: "Task Tracker" });

    await user.click(card);
    expect(onExpand).toHaveBeenCalledWith("task-tracker");
    expect(onNavigate).not.toHaveBeenCalled();

    rerender(
      <ProjectCard
        project={project}
        theme="light"
        language="en"
        isExpanded
        onExpand={onExpand}
        onCollapse={() => undefined}
        onNavigate={onNavigate}
      />
    );

    await user.click(card);
    expect(onNavigate).toHaveBeenCalledWith("task-tracker");
  });
});
