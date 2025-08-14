export type IRoute<T extends readonly string[] = [], A = (...args: any[]) => any> = { readonly paths: string[] } & {
  [K in T[number]]?: A;
};

export interface IHandler<T extends readonly string[] = [], A = (...args: any[]) => any> {
  route: IRoute<T, A>;
  paths: string[];
  method: T[number];
  handle: A;
  params: Record<string, string>;
}

export interface IRouter<T extends readonly string[] = [], A = (...args: any[]) => any> {
  match(method: string, path: string): IHandler<T, A> | undefined;
}

export type RouterOption = {
  separator: string;
  paramSymbol: string;
};

export declare class Router<T extends readonly string[] = [], A = (...args: any[]) => any> implements IRouter<T, A> {
  constructor(private readonly methods: T, private readonly routes: IRoute<T, A>[], options?: RouterOption) {}

  match(method: string, path: string): IHandler<T, A> | undefined;
}
