const { parentPort, workerData } = require("worker_threads");

setTimeout(() => parentPort.postMessage(workerData.num), 300000)