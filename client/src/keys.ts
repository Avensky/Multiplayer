export const keys = <T extends Record<PropertyKey, unknown>>(o: T): (keyof T)[] => Object.keys(o)
// returns (keyof T)[]
// The function uses JavaScript's built-in Object.keys() method to get the keys of the object o.
// However, Object.keys() in JavaScript returns string[], which isn't always accurate in 
// TypeScript when dealing with strongly typed objects (e.g., enums, numeric keys). 
// To provide type safety, the return type is explicitly cast to (keyof T)[]