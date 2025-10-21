export interface PriceInfo {
    sourceCost: number;
    price: number;
    country: string;
}
export declare const priceListing: Record<string, PriceInfo>;
export declare const nairaPriceList: Record<string, PriceInfo>;
export declare const kePriceList: Record<string, PriceInfo>;
export declare const usdPriceList: Record<string, PriceInfo>;
