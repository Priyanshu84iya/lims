#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0fff5792c27ab40f6f13eb19f46a92aa337bde28e67fba19bce51a93c25984ba/contract';
import startContract from '../../snapshots/0fff5792c27ab40f6f13eb19f46a92aa337bde28e67fba19bce51a93c25984ba/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/196bcab5702582ff00e5fffb01cbcd497d1db42e06438c705813bb2b7cf81a04/contract';
import endContract from '../../snapshots/196bcab5702582ff00e5fffb01cbcd497d1db42e06438c705813bb2b7cf81a04/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'testOrder',
        column: col('sampleCollectedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
