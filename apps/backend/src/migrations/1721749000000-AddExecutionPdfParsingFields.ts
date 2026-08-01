import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExecutionPdfParsingFields1721749000000
  implements MigrationInterface
{
  name = 'AddExecutionPdfParsingFields1721749000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'executions',
      new TableColumn({
        name: 'temp_file_path',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'executions',
      new TableColumn({
        name: 'parser_error',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('executions', 'parser_error');
    await queryRunner.dropColumn('executions', 'temp_file_path');
  }
}
