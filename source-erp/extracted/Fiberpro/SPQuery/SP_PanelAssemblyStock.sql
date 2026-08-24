/*;=============================================   
; Author           :  Global Software's    
; Create date      :  07/11/2023    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  18/11/2023  03.30 PM 
; =============================================  */  

CREATE PROCEDURE SP_PanelAssemblyStock (@Ordid int,@StyleNo Varchar(30),@coycode int,@godId int ,@colId int,@Lot Varchar(100),@PartId Int,@IpAddress Varchar(200))
AS
BEGIN 
DECLARE @SQLSTR AS NVARCHAR(Max) =''
DECLARE @MinSno int,@MaxSlno int
DECLARE @CompId int,@SStageID int
DECLARE @PcsStockID int
DEClARE @LotID int 

/* SELECt @LotID = LotSNo FROM Mas_Lot Where LotName = @Lot  */

SELECT @MinSno = min(Slno) , @MaxSlno = max(Slno) FROM Tmp_SourceStage Where IpAddress = @IpAddress

SET @SQLSTR =N'Select sizeDesc , Min(Pcs) Expr1 from ('

WHILE(@MinSno IS NOT NULL AND @MinSno <= @MaxSlno)

BEGIN

 SELECT @CompId = CompId FROM	Tmp_SourceStage Where IpAddress = @IpAddress And  Slno = @MinSno
 SELECT @SStageID = StageID FROM Tmp_SourceStage Where IpAddress = @IpAddress And  Slno = @MinSno


Set @SQLSTR= @SqlStr + N' 
Select  SizeDesc ,(select isnull(sum(StockQty),0) pcs from Panel_StockTableQty Where PcsStockId=
x.PcsStockId and ColId = X.ColId And CompID = X.CompID And SizeId =x.SizeID) as pcs from (
Select a1.PcsStockId,a.CompID,A.ColId, c.SizeID, SizeDesc from Panel_StockTable A1 INNER JOIN Panel_StockTableQty A ON A.PcsStockId = A1.PcsStockId
Right Join OrdSizeMas C ON A1.OrdId = C.OrdID And A1.StyleNo = C.StyleNo   
 Left JOIN Mas_Size B ON C.SizeId = B.SizeID 
where A1.OrdId =@Ordid And A1.Styleno = @StyleNo  And A1.StageId = ''' + Rtrim(@SStageID) + ''' And A.ColId = @colId And CompID = ''' + Rtrim(@CompId) + ''' And A1.Coycode = @coycode
 And GoodPcsFlag =''G'' and RejectionTypeId = 0 and PartyId = 0 and GodId= @godId  and LotId  = @Lot And A1.PartId = @PartId 
Group by SizeDesc,C.SizeID,a1.PcsStockId,a.CompID,a.ColId ) X '


if @MinSno	<> @MaxSlno 
BEGIN
SET @SQLSTR = @SQLSTR + ' UNION '
END 


SET @MinSno  = @MinSno  + 1 



END
SET @SQLSTR = @SQLSTR + N') X1 Group by SizeDesc'

Print @SqlStr
EXEC SP_EXECUTESQL @SQLSTR,N'@Ordid int,@StyleNo Varchar(30),@coycode int,@godId int ,@colId int,@Lot Varchar(100),@PartId Int,@IpAddress Varchar(200)',@Ordid=@Ordid,@StyleNo=@StyleNo,@coycode=@coycode,@godId=@godId,@colId=@colId,@Lot=@Lot,@PartId=@PartId,@IpAddress=@IpAddress End