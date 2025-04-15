import { Prisma } from '@prisma/client';

export const dbExceptionHandler = (error: unknown) => {
  // Avoid using console.error/log with the error object directly
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        const field = (error.meta?.target as string[]) || [];
        throw new Error(`Unique constraint violation on field(s): ${field.join(', ')}`);
      case 'P2000':
        throw new Error('Invalid data provided');
      case 'P2003':
        throw new Error('Foreign key constraint failed');
      default:
        throw new Error(`Database error: ${errorMessage}`);
    }
  }

  throw new Error(`Database error: ${errorMessage}`);
};
