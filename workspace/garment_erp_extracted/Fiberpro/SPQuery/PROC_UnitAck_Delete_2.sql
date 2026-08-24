/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  UNIT ACK
; Change Person    :  KALAI
; Last Change Date :  21/01/2026 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_UnitAck_Delete_2 (@Id Int) AS  DECLARE @OrdId Int,@StageId Int ,@SourceCoycode int ,@StyleNo Varchar(20),
@LotNo Varchar(15),@ColId int,@PartID Int,@SizeID Int,@Pcs Int,@PanelId Int,@StyleID Int,@TransId Int,@LotId Int ,@EmpId Int
Select @Id = @Id  
SELECT @OrdId = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
SELECT @SourceCoycode = coycode From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id 
SELECT  @EmpId=Trs_UnitAck2.SrcLineID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.ID=Trs_UnitAck2.TransID Where Trs_UnitAck2.ID=@Id 
BEGIN   DECLARE LINE_CURSOR CURSOR FOR  
Select Id,ColId,StyleId,PanelId,SizeID,Styleno,PartID,TransId,Pcs,LotNo FROM Trs_UnitAck2 Where ID=@Id   
OPEN LINE_CURSOR  FETCH NEXT FROM LINE_CURSOR INTO @id,@ColId,@StyleId,@PanelId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo    
WHILE @@FETCH_STATUS = 0    BEGIN 	if ltrim(@LotNo)<>''  	SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 	
ELSE  	SELECT @LotId = 0  
/* Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+Deleted.Pcs From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_UnitAck1 On Pcs_StockTable.Coycode=
Trs_UnitAck1.sender And Pcs_StockTable.GodId=Trs_UnitAck1.GodId Inner Join Deleted On Trs_UnitAck1.Id=Deleted.Id And 
Pcs_StockTable.StyleNo=Deleted.StyleNo And Pcs_StockTable.PartId=Deleted.PartId And 
Pcs_StockTableQty.ColId=Deleted.ColId And Pcs_StockTableQty.SizeId=Deleted.SizeId where Pcs_StockTable.coycode=Trs_UnitAck1.sender 
and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=Deleted.StyleNo and Pcs_StockTable.Stageid=@StageId and Pcs_Stock
Table.PartId=Deleted.PartId and Pcs_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Pcs_StockTableQty.ColId=Deleted.Colid 
and Pcs_StockTableQty.SizeId=Deleted.SizeId  */ 
IF  @EmpId=0  BEGIN
UPDATE Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@Pcs From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_UnitAck1 On Pcs_StockTable.Coycode=
Trs_UnitAck1.Coycode And Pcs_StockTable.GodId=Trs_UnitAck1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId 
And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId where Pcs_StockTable.coycode=Trs_UnitAck1.Coycode and 
Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=@StageId and Pcs_StockTable.PartId=@PartId 
and Pcs_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId 
And Pcs_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID and Pcs_StockTableQty.GoodPcsFlag='G' And Pcs_StockTable.EmpID=0
END ELSE BEGIN
UPDATE Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@Pcs From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_UnitAck1 On Pcs_StockTable.Coycode=
Trs_UnitAck1.Coycode And Pcs_StockTable.GodId=Trs_UnitAck1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId 
And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId where Pcs_StockTable.coycode=Trs_UnitAck1.Coycode and 
Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=@StageId and Pcs_StockTable.PartId=@PartId 
and Pcs_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId 
And Pcs_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID and Pcs_StockTableQty.GoodPcsFlag='G' And Pcs_StockTable.EmpID=@EmpId END
 FETCH NEXT 
FROM LINE_CURSOR INTO @id,@ColId,@StyleId,@PanelId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo  END  CLOSE LINE_CURSOR    
DEALLOCATE LINE_CURSOR    SET NOCOUNT OFF   END