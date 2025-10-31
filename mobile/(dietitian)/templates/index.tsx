import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../features/auth/stores/auth-store';
import { api } from '../../core/api/client';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Loading } from '../../shared/ui/Loading';
import { 
  FileText, 
  ChevronRight,
  PlusCircle,
  Calendar 
} from 'lucide-react-native';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  createdAt: string;
  oguns: Array<{
    id: number;
    name: string;
    time: string;
    items: Array<{
      id: number;
      miktar: number;
      besin: {
        name: string;
      };
      birim: {
        name: string;
      };
    }>;
  }>;
}

export default function TemplatesListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/api/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const useTemplate = async (templateId: number) => {
    try {
      // TODO: Implement template usage - redirect to diet creation with template
      router.push(`/(dietitian)/diets/from-template?templateId=${templateId}`);
    } catch (error) {
      console.error('Error using template:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  if (isLoading) {
    return <Loading text="Şablonlar yükleniyor..." />;
  }

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-secondary-200">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xl font-bold text-secondary-900">
            Şablonlar
          </Text>
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement template creation
              console.log('Create new template');
            }}
            className="bg-primary-600 px-3 py-2 rounded-lg"
          >
            <PlusCircle className="h-5 w-5 text-white" />
          </TouchableOpacity>
        </View>
        <Text className="text-secondary-600 text-sm">
          Hazır diyet şablonlarını kullanarak hızlıca program oluşturun
        </Text>
      </View>

      {/* Templates List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {templates.length === 0 ? (
            <Card>
              <View className="py-12 items-center">
                <FileText className="h-16 w-16 text-secondary-400 mb-4" />
                <Text className="text-lg font-medium text-secondary-700 mb-2">
                  Henüz şablon bulunmuyor
                </Text>
                <Text className="text-secondary-600 text-center mb-6">
                  İlk şablonunuzı oluşturun
                </Text>
                <Button
                  onPress={() => {
                    // TODO: Implement template creation
                    console.log('Create new template');
                  }}
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  İlk Şablonu Oluştur
                </Button>
              </View>
            </Card>
          ) : (
            <View className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <FileText className="h-5 w-5 text-primary-600 mr-2" />
                        <Text className="text-lg font-semibold text-secondary-900">
                          {template.name}
                        </Text>
                      </View>
                      
                      <View className="space-y-1">
                        {template.category && (
                          <Text className="text-primary-600 text-sm font-medium">
                            {template.category}
                          </Text>
                        )}
                        
                        {template.description && (
                          <Text className="text-secondary-600 text-sm">
                            {template.description}
                          </Text>
                        )}
                        
                        <View className="flex-row items-center">
                          <Calendar className="h-4 w-4 text-secondary-500 mr-2" />
                          <Text className="text-secondary-600 text-sm">
                            Oluşturulma: {formatDate(template.createdAt)}
                          </Text>
                        </View>
                        
                        <Text className="text-secondary-600 text-sm">
                          {template.oguns.length} öğün
                        </Text>
                      </View>
                    </View>
                    
                    <View className="ml-4 space-y-2">
                      <TouchableOpacity
                        onPress={() => useTemplate(template.id)}
                        className="bg-primary-600 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-white font-medium text-sm">
                          Kullan
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => {
                          // TODO: Implement template details view
                          console.log('View template details');
                        }}
                        className="bg-secondary-200 px-3 py-2 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4 text-secondary-600" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
