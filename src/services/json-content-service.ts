export class JsonContentService {
  async create(operatorId: number, values: z.infer<typeof yourSchema>) {
    try {
      const result = await this._yourRepository.create(operatorId, values);
      return result;
    } catch (error) {
      const handledError = dbExceptionHandler(error);
      // You can add additional error handling here if needed
      throw handledError;
    }
  }
}