import DietForm from "../../../components/DietForm";
import DietConversationsTable from "../../../components/DietConversationsTable";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Danışanlarla Sohbetler</h2>
        <DietConversationsTable />
      </div>

      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Yeni Diyet Oluştur</h2>
        <DietForm />
      </div>
    </div>
  );
}
