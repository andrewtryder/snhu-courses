import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../honeybadger.server.config.js");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const { reportServerError } = await import("@/lib/monitoring/honeybadger");

  await reportServerError(error, {
    component: "nextjs",
    action: "onRequestError",
    context: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    tags: ["nextjs", "onRequestError"],
  });
};
