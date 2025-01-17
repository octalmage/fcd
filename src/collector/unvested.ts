import { orderBy, reverse, chain } from 'lodash'
import * as globby from 'globby'
import * as fs from 'fs'
import { getConnection } from 'typeorm'
import { UnvestedEntity } from 'orm'
import { collectorLogger as logger } from 'lib/logger'

function unvestedMapper(unvested: Coin): UnvestedEntity {
  const item = new UnvestedEntity()

  item.datetime = new Date()
  item.denom = unvested.denom
  item.amount = unvested.amount
  return item
}

async function getUnvested(): Promise<UnvestedEntity[]> {
  const paths = await globby([`/tmp/vesting-*`])
  const recentFile = reverse(orderBy(paths))[0]

  if (!recentFile) {
    return []
  }

  const unvestedString = fs.readFileSync(recentFile, 'utf8')
  const unvested = JSON.parse(unvestedString)
  return chain(unvested.map(unvestedMapper)).compact().value()
}

export async function collectUnvested() {
  const docs = await getUnvested()

  await getConnection().manager.save(docs)
  logger.info(`Save Unvested - success.`)
}
