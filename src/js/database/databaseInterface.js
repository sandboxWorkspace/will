export class DatabaseInterface {
    constructor() {
        if (this.constructor === DatabaseInterface) {
            throw new Error("Cannot instantiate abstract class!");
        }
    }
    async initialize() {
        throw new Error("Method 'initialize()' must be implemented.");
    }
    async saveData(path, value) {
        throw new Error("Method 'saveData()' must be implemented.");
    }

    async loadData(path) {
        throw new Error("Method 'loadData()' must be implemented.");
    }

    async logChange(path, time, dayIndex, oldValue, newValue) {
        throw new Error("Method 'logChange()' must be implemented.");
    }

    async loadChangeLog(path) {
        throw new Error("Method 'loadChangeLog()' must be implemented.");
    }
}
