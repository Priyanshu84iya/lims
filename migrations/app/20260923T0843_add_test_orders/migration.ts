#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0fff5792c27ab40f6f13eb19f46a92aa337bde28e67fba19bce51a93c25984ba/contract';
import endContract from '../../snapshots/0fff5792c27ab40f6f13eb19f46a92aa337bde28e67fba19bce51a93c25984ba/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a0803f1ee0109c3ef17e9c6bff2eec8c2a89754378de6db389fbe1305e175902/contract';
import startContract from '../../snapshots/a0803f1ee0109c3ef17e9c6bff2eec8c2a89754378de6db389fbe1305e175902/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'testOrder',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('referredBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reportId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'testOrderResult',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inputType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('parameterCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parameterName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceDisplay', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('referenceMax', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('referenceMin', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('result', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('testOrderTestId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'testOrderTest',
        columns: [
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('testCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('testName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('testOrderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'testOrder',
        constraint: 'testOrder_orderNumber_key',
        columns: ['orderNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'testOrder',
        index: 'testOrder_labId_idx_0e579cfa',
        columns: ['labId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'testOrder',
        index: 'testOrder_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'testOrder',
        index: 'testOrder_reportId_idx_d163019e',
        columns: ['reportId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'testOrderResult',
        index: 'testOrderResult_testOrderTestId_idx_95f0b785',
        columns: ['testOrderTestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'testOrderTest',
        index: 'testOrderTest_testOrderId_idx_3496779a',
        columns: ['testOrderId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'testOrder',
        foreignKey: {
          name: 'testOrder_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'testOrder',
        foreignKey: {
          name: 'testOrder_labId_fkey',
          columns: ['labId'],
          references: { schema: 'public', table: 'lab', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'testOrder',
        foreignKey: {
          name: 'testOrder_reportId_fkey',
          columns: ['reportId'],
          references: { schema: 'public', table: 'report', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'testOrderResult',
        foreignKey: {
          name: 'testOrderResult_testOrderTestId_fkey',
          columns: ['testOrderTestId'],
          references: { schema: 'public', table: 'testOrderTest', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'testOrderTest',
        foreignKey: {
          name: 'testOrderTest_testOrderId_fkey',
          columns: ['testOrderId'],
          references: { schema: 'public', table: 'testOrder', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
