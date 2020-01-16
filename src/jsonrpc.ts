export default class JSONRPC {
  public static async call<T>(url: string, method: string, params: any, configure = (req: Request) => req) {
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

export class JSONRPCError extends Error {
  public readonly code: number;
  public readonly data: any;

  constructor(error: { message: string, code: number, data: any }) {
    super(error.message);
    this.code = error.code;
    this.data = error.data;
  }
}
