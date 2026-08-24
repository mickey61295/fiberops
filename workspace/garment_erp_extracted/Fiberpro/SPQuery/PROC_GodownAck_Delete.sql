/*;=============================================   
; Author           :  Global Software's    
; Create date      :  04/02/2026    
; Create By        :  ASLAM  
; Description      :  GODOWN ACK
; Change Person    :  KALAI
; Last Change Date :  04/02/2026 10.00 AM 
; =============================================  */  


CREATE PROCEDURE PROC_GodownAck_Delete (@ID int) AS   
DECLARE @OrdId Int,@StageId Int ,@LotNo Varchar(15),@LotId int, @ColId int,@PartID Int,@SizeID Int,@Pcs Int,@PanelId Int,
@StyleNo Varchar(20),@transId int,@Coycode int ,@GodId int ,@SrcLineID Int
Select @Id = @Id  
Select @GodId = GodId  from Trs_PcsGodAck1 Where ID = @Id 
Select @coycode = coycode  from Trs_PcsGodAck1 Where ID = @Id 
SELECT @OrdId = Ordjobno From Trs_Pcs1 Inner Join Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.TransId Where Trs_PcsGodAck2.Id=@Id   
SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.TransId Where Trs_PcsGodAck2.Id=@Id   
BEGIN DECLARE LINE_CURSOR CURSOR FOR  /*Select Id,ColId,SizeID,Styleno,PartID,TransId,Pcs,LotNo FROM  Trs_PcsGodAck2  Where ID=@Id */
Select Trs_PcsGodAck2.Id,Trs_PcsGodAck2.ColId,Trs_PcsGodAck2.SizeID,Trs_PcsGodAck2.Styleno,Trs_PcsGodAck2.PartID,TransId,Trs_PcsGodAck2.Pcs,Trs_PcsGodAck2.LotNo,TargetStageID,Ordjobno,Isnull(SrcLineID,0) as SrcLineID FROM  Trs_Pcs1 Inner Join 
Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.
TransId Inner Join Trs_Pcs2 On Trs_Pcs1.ID=Trs_Pcs2.ID  And Trs_Pcs2.ColID=Trs_PcsGodAck2.ColId And Trs_Pcs2.SizeID=Trs_PcsGodAck2.SizeId
And Trs_Pcs2.StyleNo=Trs_PcsGodAck2.StyleNo And  Trs_Pcs2.PartID=Trs_PcsGodAck2.PartID And Trs_Pcs2.LotNo=Trs_PcsGodAck2.LotNo 
Where Trs_PcsGodAck2.ID=@Id OPEN LINE_CURSOR  FETCH NEXT FROM LINE_CURSOR INTO 
@id,@ColId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo,@StageId,@OrdId,@SrcLineID     WHILE @@FETCH_STATUS = 0 BEGIN if ltrim(@LotNo)<>''   
SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 	 ELSE   SELECT @LotId = 0   

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty - @Pcs From Pcs_StockTableQty 
Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGodAck1 On 
Pcs_StockTable.Coycode=Trs_PcsGodAck1.Coycode And Pcs_StockTable.GodId=Trs_PcsGodAck1.GodId And Pcs_StockTable.StyleNo=@StyleNo 
And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId where 
Pcs_StockTable.coycode=Trs_PcsGodAck1.Coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and 
Pcs_StockTable.Stageid=@StageId and Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGodAck1.GodId and 
PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId    and Pcs_StockTable.Coycode=@coycode     
and Pcs_StockTable.GodId=@GodId and Trs_PcsGodAck1.Id = @ID And GoodPcsFlag='G' And IsNull(Pcs_StockTable.EmpID,0)=@SrcLineID  
FETCH NEXT FROM LINE_CURSOR INTO @id,@ColId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo,@StageId,@OrdId,@SrcLineID  END    CLOSE   
LINE_CURSOR  DEALLOCATE LINE_CURSOR    SET NOCOUNT OFF   END