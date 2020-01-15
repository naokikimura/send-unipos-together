export default class JSONRPC {
  static async call<T>(url: string, method: string, params: any, configure = (request: Request) => request) {
    const request = new Request(url, {
      "headers": {
        "accept": "application/json",
        "content-type": "application/json",
      },
      "body": JSON.stringify({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": String(new Date().getTime() * 1000 + Math.floor(Math.random() * 1000))
      }),
      "method": "POST"
    });
    const res = await fetch(configure(request));
    const body = await res.json();
    if (body.error)
      throw new class JSONRPCError extends Error {
        code: number;
        data: any;
        constructor(error: { message: string, code: number, data: any }) {
          super(error.message);
          this.code = error.code;
          this.data = error.data;
        }
      }(body.error);
    return body.result as T;
  }
}