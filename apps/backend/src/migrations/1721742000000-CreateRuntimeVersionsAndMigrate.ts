import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';
import { randomUUID } from 'node:crypto';

export class CreateRuntimeVersionsAndMigrate1721742000000
  implements MigrationInterface
{
  name = 'CreateRuntimeVersionsAndMigrate1721742000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'runtime_versions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'runtime_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['Draft', 'Published', 'Archived'],
            default: "'Draft'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_runtime_versions_runtime_id_version',
            columnNames: ['runtime_id', 'version'],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'runtime_versions',
      new TableForeignKey({
        name: 'FK_runtime_versions_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.addColumn(
      'runtimes',
      new TableColumn({
        name: 'active_version_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'runtimes',
      new TableForeignKey({
        name: 'FK_runtimes_active_version_id',
        columnNames: ['active_version_id'],
        referencedTableName: 'runtime_versions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    const runtimes: Array<{ id: string }> = await queryRunner.query(
      'SELECT `id` FROM `runtimes`',
    );

    for (const runtime of runtimes) {
      const configs: Array<{ instructions: string }> = await queryRunner.query(
        'SELECT `instructions` FROM `runtime_configurations` WHERE `runtime_id` = ? LIMIT 1',
        [runtime.id],
      );

      const instructions = configs[0]?.instructions ?? '';
      const versionId = randomUUID();

      await queryRunner.query(
        `INSERT INTO \`runtime_versions\`
          (\`id\`, \`runtime_id\`, \`version\`, \`instructions\`, \`status\`)
         VALUES (?, ?, 1, ?, 'Draft')`,
        [versionId, runtime.id, instructions],
      );
    }

    await queryRunner.dropTable('runtime_configurations', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'runtime_configurations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'runtime_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'questions',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_runtime_configurations_runtime_id',
            columnNames: ['runtime_id'],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'runtime_configurations',
      new TableForeignKey({
        name: 'FK_runtime_configurations_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    const drafts: Array<{
      id: string;
      runtime_id: string;
      instructions: string;
    }> = await queryRunner.query(
      `SELECT \`id\`, \`runtime_id\`, \`instructions\`
       FROM \`runtime_versions\`
       WHERE \`status\` = 'Draft'`,
    );

    for (const draft of drafts) {
      await queryRunner.query(
        `INSERT INTO \`runtime_configurations\`
          (\`id\`, \`runtime_id\`, \`instructions\`, \`questions\`)
         VALUES (?, ?, ?, ?)`,
        [randomUUID(), draft.runtime_id, draft.instructions, JSON.stringify([])],
      );
    }

    const activeFk = await queryRunner.getTable('runtimes');
    const fk = activeFk?.foreignKeys.find(
      (key) => key.name === 'FK_runtimes_active_version_id',
    );
    if (fk) {
      await queryRunner.dropForeignKey('runtimes', fk);
    }
    await queryRunner.dropColumn('runtimes', 'active_version_id');
    await queryRunner.dropTable('runtime_versions', true);
  }
}
