#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a0803f1ee0109c3ef17e9c6bff2eec8c2a89754378de6db389fbe1305e175902/contract';
import endContract from '../../snapshots/a0803f1ee0109c3ef17e9c6bff2eec8c2a89754378de6db389fbe1305e175902/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'admin',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'contactMessage',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isRead', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'customTest',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('definition', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'lab',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('directorName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('directorQualification', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('gstNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('licenseNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('loginEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('logoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phoneCountryCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('pincode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('registrationNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('signatureUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('state', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'patient',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dateOfBirth', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('patientCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phoneCountryCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('referredBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'report',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('patientId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('referredBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reportDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reportNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sampleCollectedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
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
        table: 'reportResult',
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
          col('reportTestId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('result', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'reportTest',
        columns: [
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reportId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('testCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('testName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('adminId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('labId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'admin',
        constraint: 'admin_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'lab',
        constraint: 'lab_loginEmail_key',
        columns: ['loginEmail'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'patient',
        constraint: 'patient_labId_patientCode_key',
        columns: ['labId', 'patientCode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'report',
        constraint: 'report_reportNumber_key',
        columns: ['reportNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'session',
        constraint: 'session_token_key',
        columns: ['token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'customTest',
        index: 'customTest_labId_idx_0e579cfa',
        columns: ['labId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'patient',
        index: 'patient_labId_idx_0e579cfa',
        columns: ['labId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'report',
        index: 'report_labId_idx_0e579cfa',
        columns: ['labId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'report',
        index: 'report_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reportResult',
        index: 'reportResult_reportTestId_idx_1c51813c',
        columns: ['reportTestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reportTest',
        index: 'reportTest_reportId_idx_d163019e',
        columns: ['reportId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'customTest',
        foreignKey: {
          name: 'customTest_labId_fkey',
          columns: ['labId'],
          references: { schema: 'public', table: 'lab', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'patient',
        foreignKey: {
          name: 'patient_labId_fkey',
          columns: ['labId'],
          references: { schema: 'public', table: 'lab', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'report',
        foreignKey: {
          name: 'report_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'report',
        foreignKey: {
          name: 'report_labId_fkey',
          columns: ['labId'],
          references: { schema: 'public', table: 'lab', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reportResult',
        foreignKey: {
          name: 'reportResult_reportTestId_fkey',
          columns: ['reportTestId'],
          references: { schema: 'public', table: 'reportTest', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reportTest',
        foreignKey: {
          name: 'reportTest_reportId_fkey',
          columns: ['reportId'],
          references: { schema: 'public', table: 'report', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
