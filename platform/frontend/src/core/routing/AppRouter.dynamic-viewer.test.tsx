import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthSessionProvider } from "../auth/auth-session";
import { DynamicProjectViewer } from "../pages/DynamicProjectViewer";
import { ProtectedRoute } from "./ProtectedRoute";

jest.mock("../../public/data/project-store", () => ({
  useProjectPost: (id?: string) =>
    id === "qr-generator"
      ? {
          id: "qr-generator",
          title: { en: "QR Generator", ru: "QR Generator RU" },
          summary: { en: "Summary", ru: "Summary RU" },
          description: { en: "Description", ru: "Description RU" },
          tags: ["qr", "generator"],
          heroImage: { light: "l", dark: "d" },
          screenshots: [{ light: "s", dark: "s" }],
          template: "JavaScript",
          frontendPath: "/var/projects/qr-generator/frontend",
          backendPath: "/var/projects/qr-generator/backend"
        }
      : undefined,
  fetchProjectByIdFromApi: async (id: string) =>
    id === "qr-generator"
      ? {
          id: "qr-generator",
          title: { en: "QR Generator", ru: "QR Generator RU" },
          summary: { en: "Summary", ru: "Summary RU" },
          description: { en: "Description", ru: "Description RU" },
          tags: ["qr", "generator"],
          heroImage: { light: "l", dark: "d" },
          screenshots: [{ light: "s", dark: "s" }],
          template: "JavaScript",
          frontendPath: "/var/projects/qr-generator/frontend",
          backendPath: "/var/projects/qr-generator/backend"
        }
      : null
}));

describe("DynamicProjectViewer /app/:slug", () => {
  test("loads viewer for admin route /app/:slug", async () => {
    render(
      <AuthSessionProvider value={{ isAuthenticated: true, role: "Admin", signIn: () => undefined, signOut: () => undefined }}>
        <MemoryRouter initialEntries={["/app/qr-generator"]}>
          <Routes>
            <Route
              path="/app/:slug"
              element={
                <ProtectedRoute adminOnly>
                  <DynamicProjectViewer />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<div>Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionProvider>
    );

    expect(await screen.findByRole("heading", { name: "QR Generator" })).toBeInTheDocument();
    expect(screen.getByTitle("qr-generator-preview")).toBeInTheDocument();
  });
});
