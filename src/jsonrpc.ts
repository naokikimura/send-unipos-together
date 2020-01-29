export class JSONRPCError extends Error {
  public readonly code: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly data: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(error: { message: string; code: number; data: any }) {
    super(error.message);
    this.code = error.code;
    this.data = error.data;
  }
}

const defaultConfigure = (request: Request): Request => request;

export default class JSONRPC {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static async call<T>(url: string, method: string, params: any, configure = defaultConfigure): Promise<T> {
    const request = new Request(url, {
      body: JSON.stringify({
        id: String(new Date().getTime() * 1000 + Math.floor(Math.random() * 1000)),
        jsonrpc: '2.0',
        method,
        params,
      }),
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const res = await fetch(configure(request));
    const body = await res.json();
    if (body.error) throw new JSONRPCError(body.error);
    return body.result as T;
  }
}
