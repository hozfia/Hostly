export namespace hosts {
	
	export class HostEntry {
	    line: number;
	    raw: string;
	    ip: string;
	    hostnames: string[];
	    comment?: string;
	    disabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HostEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.line = source["line"];
	        this.raw = source["raw"];
	        this.ip = source["ip"];
	        this.hostnames = source["hostnames"];
	        this.comment = source["comment"];
	        this.disabled = source["disabled"];
	    }
	}

}

export namespace main {
	
	export class ParsedHostsSelection {
	    path: string;
	    fileName: string;
	    entries: hosts.HostEntry[];
	    cancelled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ParsedHostsSelection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.fileName = source["fileName"];
	        this.entries = this.convertValues(source["entries"], hosts.HostEntry);
	        this.cancelled = source["cancelled"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SaveHostsSelectionEntry {
	    id: string;
	    entryId: string;
	    line: number;
	    name: string;
	    ip: string;
	    hostnames: string[];
	    comment?: string;
	    isActive: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SaveHostsSelectionEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entryId = source["entryId"];
	        this.line = source["line"];
	        this.name = source["name"];
	        this.ip = source["ip"];
	        this.hostnames = source["hostnames"];
	        this.comment = source["comment"];
	        this.isActive = source["isActive"];
	    }
	}
	export class SaveHostsSelectionItem {
	    id: string;
	    entryId?: string;
	    line?: number;
	    name: string;
	    ip?: string;
	    hostnames?: string[];
	    comment?: string;
	    isActive: boolean;
	    hasPendingStateChange: boolean;
	    children?: SaveHostsSelectionEntry[];
	
	    static createFrom(source: any = {}) {
	        return new SaveHostsSelectionItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entryId = source["entryId"];
	        this.line = source["line"];
	        this.name = source["name"];
	        this.ip = source["ip"];
	        this.hostnames = source["hostnames"];
	        this.comment = source["comment"];
	        this.isActive = source["isActive"];
	        this.hasPendingStateChange = source["hasPendingStateChange"];
	        this.children = this.convertValues(source["children"], SaveHostsSelectionEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace storage {
	
	export class GroupEntry {
	    id: string;
	    entryId?: string;
	    line?: number;
	    name: string;
	    ip?: string;
	    hostnames?: string[];
	    comment?: string;
	    isActive: boolean;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new GroupEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entryId = source["entryId"];
	        this.line = source["line"];
	        this.name = source["name"];
	        this.ip = source["ip"];
	        this.hostnames = source["hostnames"];
	        this.comment = source["comment"];
	        this.isActive = source["isActive"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class Group {
	    id: string;
	    name: string;
	    isActive: boolean;
	    sortOrder: number;
	    children?: GroupEntry[];
	
	    static createFrom(source: any = {}) {
	        return new Group(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.isActive = source["isActive"];
	        this.sortOrder = source["sortOrder"];
	        this.children = this.convertValues(source["children"], GroupEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

