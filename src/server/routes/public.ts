import path from "path";

const runnerFolder = path.join(__dirname, "..", "..", "..");
const rootNodeModules = path.join(runnerFolder, "node_modules");

export default [
  {
    method: "GET",
    path: "/assets/{path*}",
    options: {
      handler: {
        directory: {
          path: [
            path.join(runnerFolder, "public", "static"),
            path.join(runnerFolder, "public", "build"),
            path.join(rootNodeModules, "accessible-autocomplete", "dist"),
            path.join(rootNodeModules, "govuk-frontend", "govuk"),
            path.join(rootNodeModules, "govuk-frontend", "govuk", "assets"),
            path.join(
              runnerFolder,
              "node_modules",
              "hmpo-components",
              "assets"
            ),
          ],
        },
      },
    },
  },
];
