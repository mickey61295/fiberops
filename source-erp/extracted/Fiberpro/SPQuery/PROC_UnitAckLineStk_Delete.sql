/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/01/2026    
; Create By        :  KALAI  
; Description      :  UNIT ACK
; Change Person    :  KALAI
; Last Change Date :  21/01/2026 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_UnitAckLineStk_Delete (@Id Int,@StyleNo Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15) ,
@TransID Int,@EmpID Int) AS  DECLARE @Coycode Int,@Sourcecoycode Int, @Partyid Int,@OrdId Int,@StageId Int,@GodId Int,@StockQty Int,@PcsStockId 
Int,@SeqNo int ,@ProcessType Char(1),@RejectionTypeId int ,@LotId Int 
SELECT @Coycode = Coycode From Trs_UnitAck1 Where Id=@Id 
Select @Sourcecoycode=Sender  From Trs_UnitAck1 Where Id=@Id  
SELECT @PartyId = 0   
SELECT @Ordid = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id    
and transid = @TransID and StyleNo=@StyleNo 
SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
and transid = @TransID and StyleNo=@StyleNo 
SELECT @StockQty = @Pcs  
SELECT @GodId = GodId From Trs_UnitAck1 Where Id=@Id   
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And 
Prod_Sequence.StageId=@StageId   
SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id  
SELECT @ProcessType = ProcessType From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id     
and transid = @TransID and StyleNo=@StyleNo
 if ltrim(@LotNo)<>'' SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  ELSE  SELECT @LotId = 0    
 SELECT  @EmpId=@EmpID
 begin   Select @PcsStockId=PcsStockId 
From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and Stageid=@Stageid and 
PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @EmpID 
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  Inner Join Trs_UnitAck1 On Pcs_StockTable.Coycode=
Trs_UnitAck1.Coycode And Pcs_StockTable.GodId=Trs_UnitAck1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=
@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId Inner Join Trs_UnitAck2 On Trs_UnitAck2.ID=
Trs_UnitAck1.ID where Pcs_StockTable.coycode=Trs_UnitAck1.Coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo 
and Pcs_StockTable.Stageid=@StageId and Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and 
Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID And 
Trs_UnitAck2.TransID=@TransId And ISNULL(Pcs_StockTable.EmpID,0) = @EmpID  end     
begin   Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@Sourcecoycode and Ordid=@Ordid and LotID = @LotID and 
StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @EmpID 
/*Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  Inner Join Trs_UnitAck1 On Pcs_StockTable.Coycode=
Trs_UnitAck1.Sender And Pcs_StockTable.GodId=Trs_UnitAck1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId 
And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId Inner Join Trs_UnitAck2 On Trs_UnitAck2.ID=Trs_UnitAck1.ID 
where Pcs_StockTable.coycode=Trs_UnitAck1.Sender and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and 
Pcs_StockTable.Stageid=@StageId and Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and 
Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID And 
Trs_UnitAck2.TransID=@TransId*/  end 