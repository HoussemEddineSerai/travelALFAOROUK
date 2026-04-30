module.exports = {
  apps: [
    {
      name: "alfarouk-voyage",
      script: "./server/src/index.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
