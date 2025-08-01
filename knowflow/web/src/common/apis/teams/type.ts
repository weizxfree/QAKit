export interface CreateOrUpdateTableRequestData {
  id?: number
  username: string
  email?: string
  password?: string
}

export interface TableRequestData {
  /** 当前页码 */
  currentPage: number
  /** 查询条数 */
  size: number
  /** 查询参数：用户名 */
  username?: string
  /** 查询参数：邮箱 */
  email?: string
  /** 查询参数：团队名称 */
  name?: string // 添加 name 属性
  /** 排序字段 */
  sort_by?: string
  /** 排序顺序 */
  sort_order?: "asc" | "desc"
}

export interface TableData {
  id: number
  username: string
  email: string
  createTime: string
  updateTime: string
}

export type TableResponseData = ApiResponseData<{
  list: TableData[]
  total: number
}>
