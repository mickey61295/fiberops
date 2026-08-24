/*;=============================================   
; Author           :  Global Software's    
; Create date      :  20/08/2015    
; Create By        :  ASLAM 
; Description      :  SP FOR ORDER IN HAND
; Change Person    :  Suganya
; Last Change Date :  14/03/2024 02.45 PM 
; =============================================  */  
  
CREATE PROCEDURE SP_Rpt_OrderRegColor (@Type as int,@CompFlg as char(1),@FromDate as datetime,@ToDate as datetime,@BuyerId as nvarchar(Max),@MerchId as nvarchar(MAx),@ExpId as nvarchar(Max),@SeasonId as nvarchar(Max), @StyleNo  as NVarchar(Max),@OrdId as 
NVarChar(Max) , @OrderType as nvarchar(7),  @CompSelFormula as nvarchar(200),@IoNoOrder char(1)) AS BEGIN DECLARE @SQLSTR AS NVARCHAR(4000) SET @SQLSTR=N' SELECT  row_Number() Over(Order By (select 1)) AS SNo,dbo.Vue_Rpt_OrderColor.ShortBuyer,dbo.Vue_Rpt_OrderColor.MerchName, dbo.Vue_Rpt_OrderColor.SeasonName,RTRIM(dbo.Vue_Rpt_OrderColor.Jobno)+ ''/'' + Rtrim(dbo.Vue_Rpt_OrderColor.Finyear) As IONO,dbo.Vue_Rpt_Ordercolor.OrdId,dbo.Vue_Rpt_OrderColor.BuyOrdNo,dbo.Vue_Rpt_OrderColor.BuyordDt,dbo.Vue_Rpt_OrderColor.deldt,
dbo.Vue_Rpt_OrderColor.FabricName,dbo.Vue_Rpt_OrderColor.Gsm,dbo.Vue_Rpt_OrderColor.StyleNo,dbo.Vue_Rpt_OrderColor.StyleDesc,
dbo.Vue_Rpt_OrderColor.StyleQty,dbo.Vue_Rpt_OrderColor.uom,*, ISNULL(dbo.VueDespatchColorStock.Pcs, 0) AS DespatchPcs,Vue_Rpt_OrderColor.BrandName   FROM    dbo.Vue_Rpt_OrderColor LEFT OUTER JOIN dbo.VueDespatchColorStock ON dbo.Vue_Rpt_OrderColor.OrdId = dbo.VueDespatchColorStock.Ordjobno AND   dbo.Vue_Rpt_OrderColor.StyleNo = dbo.VueDespatchColorStock.StyleNo AND dbo.Vue_Rpt_OrderColor.ColID = dbo.VueDespatchColorStock.ColID WHERE '  if Rtrim(@OrderType)<>'' Begin Set @SQLSTR=@SQLSTR+N'  Vue_Rpt_OrderColor.OrderType=@OrderType' End   if (@Type)=99 Begin Set @SQLSTR=@SQLSTR+N' And isnull((Pcs),0)>0 ' End  if (@Type)<>99 Begin Set @SQLSTR=@SQLSTR+N' And StyleCompFlg=@CompFlg ' End  if (@FromDate)<>'' Begin Set @SQLSTR=@SQLSTR+N' AND DelDt >=@FromDate' End   if (@ToDate)<>'' Begin Set @SQLSTR=@SQLSTR+N' AND DelDt <=@ToDate' End   if len(RTRIM(@BuyerId))>0 begin Set @SQLSTR=@SQLSTR+N' AND BuyerID in (Select ID From fnSplitter(@BuyerId))' End    if len(RTRIM(@MerchId))>0 begin Set @SQLSTR=@SQLSTR+N' AND MerchID in (Select ID From fnSplitter(@MerchId))' End   if len(RTRIM(@ExpId))>0 begin Set @SQLSTR=@SQLSTR+N' AND ExpID in (Select ID From fnSplitter(@ExpId))' End   if len(RTRIM(@SeasonId))>0 begin Set @SQLSTR=@SQLSTR+N' AND SeasonID in (Select ID From fnSplitter(@SeasonId))' End  If Len(Rtrim(@StyleNo))>0 Begin Set @SQLSTR=@SQLSTR+N' AND Vue_Rpt_OrderColor.StyleNo in (Select IDStr From fnSplitter_Str(@StyleNo))' End    If Len(RTRIM(@OrdId))>0 Begin Set @SQLSTR=@SQLSTR+N' AND Vue_Rpt_Ordercolor.OrdId In (Select ID From fnSplitter(@OrdId))' End  if Rtrim(@IoNoOrder)='A' Begin Set @SQLSTR=@SQLSTR+N' Order by Finyear Asc ,Jobno Asc' End     if Rtrim(@IoNoOrder)='D' Begin Set @SQLSTR=@SQLSTR+N' Order by Finyear Desc ,Jobno Desc' End     EXEC SP_EXECUTESQL  @SQLSTR, N'@Type int,@CompFlg Char(1),@FromDate datetime,@Todate datetime,@BuyerId Nvarchar(Max),@MerchId Nvarchar(Max),@ExpId Nvarchar(Max),@SeasonId Nvarchar(Max),@StyleNo NVarchar(Max), @OrderType as nvarchar(7), @IoNoOrder char(1),@OrdId NVARCHAR(Max)', @Type=@Type,@CompFlg=@CompFlg,@FromDate=@Fromdate,@Todate=@Todate,@BuyerId=@BuyerId,@MerchId=@MerchId,@ExpId=@ExpId,@SeasonId=@SeasonId,@StyleNo=@StyleNo ,  @OrderType=@OrderType,@IoNoOrder=@IoNoOrder,@OrdId=@OrdId  End
  
  
  
  
  
  
  
  
