<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('expense_class_items', function (Blueprint $table) {
            $table->id('expense_class_item_id');

            $table->foreignId('expense_class_id')
                  ->constrained('expense_classifications','expense_class_id')
                  ->cascadeOnDelete();

            $table->string('expense_class_item_name');
            $table->string('expense_class_item_acc_code', 50)->nullable()->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['expense_class_item_name'], 'expclass_item_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_class_items');
    }
};
