const { parentPort, workerData } = require("worker_threads");

console.log('Refresh speed: ',workerData.num)

setTimeout(() => parentPort.postMessage('work fine'), workerData.num);