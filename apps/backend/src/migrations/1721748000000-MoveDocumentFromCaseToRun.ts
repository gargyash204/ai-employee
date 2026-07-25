import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MoveDocumentFromCaseToRun1721748000000
  implements MigrationInterface
{
  name = 'MoveDocumentFromCaseToRun1721748000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'evaluation_runs',
      new TableColumn({
        name: 'document',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.dropColumn('evaluation_cases', 'document');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'evaluation_cases',
      new TableColumn({
        name: 'document',
        type: 'text',
        isNullable: false,
        default: "''",
      }),
    );

    // Remove MySQL default after backfill so schema matches prior NOT NULL text column
    await queryRunner.query(
      `ALTER TABLE \`evaluation_cases\` ALTER COLUMN \`document\` DROP DEFAULT`,
    );

    await queryRunner.dropColumn('evaluation_runs', 'document');
  }
}
