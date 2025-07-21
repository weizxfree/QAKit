import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import axios from 'axios';
import { get } from 'lodash';
import { useFetchKnowledgeBaseConfiguration } from './knowledge-hooks';

// KnowFlow API 调用接口
interface KnowFlowApiConfig {
  knowflow_api_url: string;
  parse_method?: string;
  language?: string;
}

// 调用 KnowFlow 解析 API
const callKnowFlowParseApi = async (
  documentId: string,
  config: KnowFlowApiConfig,
) => {
  const { knowflow_api_url, parse_method = 'auto', language = 'ch' } = config;

  // 确保 URL 格式正确
  const baseUrl = knowflow_api_url.endsWith('/')
    ? knowflow_api_url.slice(0, -1)
    : knowflow_api_url;

  try {
    // 调用 KnowFlow 的文档解析 API
    const response = await axios.post(
      `${baseUrl}/api/v1/knowledgebases/documents/${documentId}/parse`,
      {
        parse_method,
        language,
      },
      {
        timeout: 30000, // 30秒超时
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('KnowFlow API 调用失败:', error);
    throw new Error(
      error.response?.data?.message || error.message || 'KnowFlow API 调用失败',
    );
  }
};

// 获取 KnowFlow 解析进度
const getKnowFlowParseProgress = async (
  documentId: string,
  knowflowApiUrl: string,
) => {
  const baseUrl = knowflowApiUrl.endsWith('/')
    ? knowflowApiUrl.slice(0, -1)
    : knowflowApiUrl;

  try {
    const response = await axios.get(
      `${baseUrl}/api/v1/knowledgebases/documents/${documentId}/parse/progress`,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('获取 KnowFlow 解析进度失败:', error);
    throw new Error(
      error.response?.data?.message || error.message || '获取解析进度失败',
    );
  }
};

// 使用 MinerU 解析器运行文档的 Hook
export const useRunMinerUDocument = () => {
  const queryClient = useQueryClient();
  const { data: knowledgeDetail } = useFetchKnowledgeBaseConfiguration();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['runMinerUDocument'],
    mutationFn: async ({
      doc_ids,
      run,
      delete: shouldDelete,
    }: {
      doc_ids: string[];
      run: number;
      delete: boolean;
    }) => {
      // 获取 KnowFlow API 配置
      const knowflowConfig = get(
        knowledgeDetail,
        'parser_config',
        {},
      ) as KnowFlowApiConfig;

      if (!knowflowConfig.knowflow_api_url) {
        throw new Error('请在知识库配置中设置 KnowFlow API URL');
      }

      // 根据 run 参数决定操作类型
      if (run === 1) {
        // 开始解析
        const results = [];
        for (const docId of doc_ids) {
          try {
            const result = await callKnowFlowParseApi(docId, knowflowConfig);
            results.push(result);
          } catch (error: any) {
            console.error(`文档 ${docId} 解析失败:`, error);
            results.push({ code: -1, message: error.message });
          }
        }

        // 检查是否有成功的解析
        const successCount = results.filter((r) => r.code === 0).length;
        if (successCount > 0) {
          message.success(
            `已成功提交 ${successCount} 个文档到 KnowFlow 进行解析`,
          );
        }
        if (successCount < doc_ids.length) {
          message.warning(`${doc_ids.length - successCount} 个文档提交失败`);
        }

        return { code: successCount > 0 ? 0 : -1 };
      } else if (run === 2) {
        // 取消解析 - KnowFlow 可能不支持取消，这里只是返回成功
        message.info('MinerU 解析器暂不支持取消操作');
        return { code: 0 };
      }

      return { code: 0 };
    },
    onError: (error: any) => {
      message.error(`MinerU 解析失败: ${error.message}`);
    },
  });

  return { runMinerUDocument: mutateAsync, loading, data };
};

// 获取 MinerU 解析进度的 Hook
export const useFetchMinerUProgress = () => {
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['fetchMinerUProgress'],
    mutationFn: async ({
      documentId,
      knowflowApiUrl,
    }: {
      documentId: string;
      knowflowApiUrl: string;
    }) => {
      const result = await getKnowFlowParseProgress(documentId, knowflowApiUrl);
      return result;
    },
    onError: (error: any) => {
      console.error('获取 MinerU 解析进度失败:', error.message);
    },
  });

  return { fetchMinerUProgress: mutateAsync, loading, data };
};

// 批量运行 MinerU 文档解析的 Hook
export const useBatchRunMinerUDocuments = () => {
  const queryClient = useQueryClient();
  const { runMinerUDocument } = useRunMinerUDocument();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['batchRunMinerUDocuments'],
    mutationFn: async ({
      doc_ids,
      run = 1,
    }: {
      doc_ids: string[];
      run?: number;
    }) => {
      const result = await runMinerUDocument({
        doc_ids,
        run,
        delete: false,
      });

      queryClient.invalidateQueries({ queryKey: ['fetchDocumentList'] });

      return result;
    },
    onError: (error: any) => {
      console.error('批量运行 MinerU 文档解析失败:', error);
      message.error(`批量解析失败: ${error.message}`);
    },
  });

  return { batchRunMinerUDocuments: mutateAsync, loading, data };
};
