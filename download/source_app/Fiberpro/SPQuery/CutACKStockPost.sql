

/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  24/09/2022 10.00 AM 
; =============================================  */  
  
CREATE PROCEDURE CutACKStockPost (@Id int,@Type as Char(1)) AS  

DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@StockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@ProdPcs Int,@sizeId int ,@LOTID int,@LotNo varchar(100)  ,@CompID int,@ARL Int,@AKG Numeric(18,2), @AMtr Numeric(18,2),@StockID1 Int,@FRMStockID as INT,@deptID int 
 
BEGIN  

DECLARE CURSOR1 CURSOR FOR 
SELECT  trs_del2.Ordid as ordid,isnull(trs_del2.styleno,'') as styleno ,Trs_CutApr.godid as Godid,Arl,Akg,Amtr,trs_del2.tranid as stockid, trs_del2.StockID as StockId1 from trs_del1(nolock) inner join trs_del2(nolock) on trs_del1.id=trs_del2.id inner join trs_cutapr (nolock) on trs_del2.Aid=trs_cutapr.id  where trs_del1.trtype=1 and trs_del2.Aid=@ID

OPEN CURSOR1 
FETCH NEXT FROM CURSOR1 INTO @Ordid,@StyleNo,@GodID,@ARL,@AKG,@Amtr,@StockId,@StockID1
WHILE @@FETCH_STATUS = 0   
BEGIN   

	SELECT @deptID =   DEPT from StockTable Where StockId=@StockId
	IF @deptID = -7 
	BEGIN
		SELECT @FRMStockID =   isnull(FrmStockID,0) from StockTable Where StockId=@StockId	
		if @Type ='+'
			EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,-7,1,@FRMStockID
		ELSE
			EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,-7,1
	END
	ELSE
	BEGIN
		EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,0,1
	END 
    
FETCH NEXT FROM CURSOR1 INTO @Ordid,@StyleNo,@GodID,@ARL,@AKG,@Amtr,@StockId,@StockID1
END  
CLOSE CURSOR1  DEALLOCATE CURSOR1  SET NOCOUNT OFF   
END 
    
