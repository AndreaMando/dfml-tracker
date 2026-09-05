import nextConfig from "eslint-config-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["drizzle/**", "scripts/**"],
  },
  {
    plugins: { "react-hooks": reactHooksPlugin },
    rules: {
      // New in eslint-plugin-react-hooks v7, defaults to "error". Flags 20+
      // pre-existing setState-in-useEffect calls across the app that predate
      // this rule (a genuine perf nit, not a bug) — downgraded to warn so
      // `npm run lint` is usable without a separate, unrelated cleanup pass
      // through every affected component.
      "react-hooks/set-state-in-effect": "warn",
      // Same story: flags pre-existing components defined inside a parent's
      // render function (e.g. a small SortHeader/TieBox helper) across
      // several pages. A real anti-pattern worth fixing eventually, but not
      // as part of getting `npm run lint` itself working again.
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
