/** Information about an active tunnel connection. */
export interface TunnelInfo {
  /** The public URL for the tunnel. */
  url: string
  /** Close the tunnel connection. */
  close: () => Promise<void>
}

/**
 * Create a localtunnel to expose a local port to the internet.
 * @param localPort - The local port to expose.
 * @returns Tunnel information including the public URL and a close function.
 */
export async function createTunnel(localPort: number): Promise<TunnelInfo> {
  const modName = 'localtunnel'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localtunnel = (await import(modName)).default as any
  const tunnel = await localtunnel({ port: localPort })
  return {
    url: tunnel.url,
    close: () =>
      new Promise<void>((resolve) => {
        tunnel.close()
        resolve()
      }),
  }
}
