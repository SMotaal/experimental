export declare interface MonacoEnvironment {
    base?: MonacoEnvironment.base;
    getWorker?: MonacoEnvironment.getWorker;
}
export declare namespace MonacoEnvironment {
    type base = string;
    type moduleID = string;
    type label = string;
    function getWorker(moduleID: moduleID, label: label, base?: base, dynamic?: boolean): Worker;
    type getWorker = typeof getWorker;
}
export declare const getWorker: MonacoEnvironment.getWorker;
declare const exporter: (environment?: object) => MonacoEnvironment;
export default exporter;
