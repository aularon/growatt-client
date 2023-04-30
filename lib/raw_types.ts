export type RawPlantList = {
  timezone: string;
  id: string;
  plantName: string;
}[];

export type RawPlantDevices = ObjWithResult<{
  currPage: number;
  pages: number;
  pageSize: number;
  count: number;
  ind: number;
  datas: {
    deviceType: string;
    ptoStatus: string;
    timeServer: string;
    accountName: string;
    timezone: string;
    plantId: string;
    deviceTypeName: string;
    nominalPower: string;
    bdcStatus: string;
    eToday: string;
    eMonth: string;
    datalogTypeTest: string;
    eTotal: string;
    pac: string;
    datalogSn: string;
    alias: string;
    location: string;
    deviceModel: string;
    sn: string;
    plantName: string;
    status: string;
    lastUpdateTime: string;
  }[];
  notPager: boolean;
}>;

export type RawStorageStatusData = ObjWithResult<{
  vPv2: string;
  deviceType: string;
  gridPower: string;
  loadPower: string;
  vPv1: string;
  fAcOutput: string;
  invStatus: string;
  ppv2: string;
  vBat: string;
  loadPrecent: string;
  panelPower: string;
  batPower: string;
  vAcOutput: string;
  capacity: string;
  ppv1: string;
  iPv1: string;
  iPv2: string;
  vAcInput: string;
  fAcInput: string;
  iTotal: string;
  rateVA: string;
  status: string;
}>;

export type ObjWithResult<T> = {
  result: number;
  obj: T;
};
