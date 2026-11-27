export async function register() {
  // Exact check lets Next drop the node-only module from the edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./jobs");
  }
}
