/**
 * Module-level store for the PushChain client instance.
 * Used to pass the client from the Push provider tree to components outside it (e.g., DepositModal).
 */

let _pushChainClient: any = null;

export function setPushChainClientGlobal(client: any): void {
    _pushChainClient = client;
}

export function getPushChainClientGlobal(): any {
    return _pushChainClient;
}
