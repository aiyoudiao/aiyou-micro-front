import { reroute } from "./navigations/reroute";

export let started = false
export function start() {

    started = true
    // 需要挂载应用
    reroute () // 除了加载应用还需要去挂载应用
}