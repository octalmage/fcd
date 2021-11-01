import { init as initORM } from 'orm'
import { getManager, EntityManager } from 'typeorm'
import { WasmCodeEntity, WasmContractEntity } from 'orm'
import * as fs from 'fs'
import axios from 'axios'

const SLEEP_MS = +(process.env.SLEEP ?? '2000')
const client = axios.create({
  timeout: 30000
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sample contract
// {
//   "id": 2782,
//   "owner": "terra1dfy3rs8h30ul2c4jn45swuqng4f9y3fc77mect",
//   "creator": "terra1dfy3rs8h30ul2c4jn45swuqng4f9y3fc77mect",
//   "code_id": "762",
//   "init_msg": "{}",
//   "txhash": "a19f2f82ec5a1d4498ba961290c777de4a7b9bdbfaa5e47b78cb3b864ac2df42",
//   "timestamp": "2021-10-28T12:01:55.000Z",
//   "contract_address": "terra1qmda90g673rlgw0el6cfvl8lceeqaczfw6e30x",
//   "migrate_msg": null,
//   "info": {
//     "memo": ""
//   },
//   "code": {
//     "code_id": "762",
//     "sender": "terra1dfy3rs8h30ul2c4jn45swuqng4f9y3fc77mect",
//     "timestamp": "2021-10-28T12:00:11.000Z",
//     "txhash": "9e100fae195fc0ec7b792616fb7097a3b060e49d4327f90a3fa1cb8a03fefd37",
//     "info": {
//       "memo": ""
//     }
//   }
// }
async function fetchAllContracts(): Promise<any[]> {
  const baseURL = 'https://fcd.terra.dev/v1/wasm/contracts'
  const contracts: any[] = []
  let nextId = null
  do {
    let url = baseURL
    if (nextId !== null) {
      url = url + `?offset=${nextId}`
    }
    console.log('Fetching', url)
    const r = await client.get(url)
    const c: any[] = r.data.contracts
    contracts.push(...c)
    nextId = r.data.next
    await sleep(SLEEP_MS)
  } while (nextId)

  return contracts
}

async function fetchTxHeight(hash: string): Promise<number> {
  const url = `https://fcd.terra.dev/v1/tx/${hash}`
  const r = await client.get(url)
  return +r.data.height
}

async function saveContract(mgr: EntityManager, contract) {
  const code = contract.code
  // Check to see if a code exists for it.
  const existingCode = await mgr.findOne(WasmCodeEntity, { codeId: code.code_id })
  if (existingCode) {
    console.log(`Code ${code.code_id} found`)
  } else {
    const newCode = {
      id: code.id,
      sender: code.sender,
      codeId: code.code_id,
      txHash: code.txhash,
      txMemo: code.info.memo ?? '',
      timestamp: code.timestamp
    }
    console.log(`Creating code ${code.code_id}`)
    await mgr.save(WasmCodeEntity, newCode)
  }

  // We need to check to see if the contract already exists because the FCD will
  // returns duplicate records. Bug in the fcd?
  const existingContract = await mgr.findOne(WasmContractEntity, { contractAddress: contract.contract_address })
  if (existingContract) {
    console.log(`Contract ${contract.contractAddress} already exists`)
  } else {
    const newContract = {
      creator: contract.creator,
      owner: contract.owner,
      codeId: contract.code_id,
      initMsg: contract.init_msg,
      contractAddress: contract.contract_address,
      txHash: contract.txhash,
      txMemo: contract.info.memo ?? '',
      timestamp: contract.timestamp,
      migrateMsg: contract.migrate_msg
    }
    await mgr.save(WasmContractEntity, newContract)
    console.log(`Creating contract ${code.code_id}`)
    console.log('Saved contract')
  }
}

const END_DATE = Date.parse('Thu Sep 30 2021 07:00:00 UTC')
const saveFile = 'contracts.json'
const start = async () => {
  await initORM()
  let contracts

  if (fs.existsSync(saveFile)) {
    console.log('Reading contracts from local file')
    const data = fs.readFileSync(saveFile, 'utf8')
    contracts = JSON.parse(data)
  } else {
    console.log('Fetching contracts from FCD')
    contracts = await fetchAllContracts()
    fs.writeFileSync(saveFile, JSON.stringify(contracts, null, 2))
  }
  const manager = getManager()

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i]
    // If this contract was created before columbus 5 add it to our db.
    const timeStamp = Date.parse(c.timestamp)
    if (timeStamp < END_DATE) {
      await saveContract(manager, c)
    }
  }
}

start().catch(console.log)
