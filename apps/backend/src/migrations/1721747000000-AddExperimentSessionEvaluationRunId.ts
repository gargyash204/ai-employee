import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddExperimentSessionEvaluationRunId1721747000000
  implements MigrationInterface
{
  name = 'AddExperimentSessionEvaluationRunId1721747000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'experiment_sessions',
      new TableColumn({
        name: 'evaluation_run_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_sessions',
      new TableForeignKey({
        name: 'FK_experiment_sessions_evaluation_run_id',
        columnNames: ['evaluation_run_id'],
        referencedTableName: 'evaluation_runs',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'experiment_sessions',
      'FK_experiment_sessions_evaluation_run_id',
    );
    await queryRunner.dropColumn('experiment_sessions', 'evaluation_run_id');
  }
}
