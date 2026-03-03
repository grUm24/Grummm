describe("Admin project workspace and dynamic viewer", () => {
  const authSession = JSON.stringify({ isAuthenticated: true, role: "Admin" });

  beforeEach(() => {
    cy.intercept("GET", "/api/public/projects", {
      statusCode: 200,
      body: { items: [] }
    });
  });

  it("renders template instructions when template is selected in /app/projects", () => {
    cy.visit("/app/projects", {
      onBeforeLoad(win) {
        win.localStorage.setItem("platform.auth.session", authSession);
        win.localStorage.setItem("platform.auth.accessToken", "test-token");
      }
    });

    cy.get('[data-testid="template-type-select"]').select("Python");
    cy.get('[data-testid="template-instructions"]').should("be.visible");
    cy.contains("Upload Python service files").should("be.visible");
  });

  it("renders iframe viewer in /app/:slug for template project", () => {
    cy.intercept("GET", "/api/app/projects/qr-generator", {
      statusCode: 200,
      body: {
        id: "qr-generator",
        title: { en: "QR Generator", ru: "QR Generator" },
        summary: { en: "Summary", ru: "Summary" },
        description: { en: "Description", ru: "Description" },
        tags: ["qr"],
        heroImage: { light: "light", dark: "dark" },
        screenshots: [{ light: "s1", dark: "s1" }],
        videoUrl: null,
        template: "JavaScript",
        frontendPath: "/var/projects/qr-generator/frontend",
        backendPath: "/var/projects/qr-generator/backend"
      }
    });

    cy.visit("/app/qr-generator", {
      onBeforeLoad(win) {
        win.localStorage.setItem("platform.auth.session", authSession);
        win.localStorage.setItem("platform.auth.accessToken", "test-token");
      }
    });

    cy.get('[data-testid="dynamic-project-frame"]')
      .should("be.visible")
      .and("have.attr", "src", "/app/qr-generator/index.html");
  });
});

