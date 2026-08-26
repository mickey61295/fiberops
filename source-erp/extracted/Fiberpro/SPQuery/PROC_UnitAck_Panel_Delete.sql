/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  16/06/2023 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_UnitAck_Panel_Delete (@Id Int,@StyleNo Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15) ,@TransID Int,@compID int ) AS  DECLARE @Coycode Int,@Sourcecoycode Int, @Partyid Int,@OrdId Int,@StageId Int,@GodId Int,@StockQty Int,@PcsStockId Int,@SeqNo int ,@ProcessType Char(1),@RejectionTypeId int ,@LotId Int 

SELECT @Coycode = Coycode From Trs_UnitAck1 Where Id=@Id 
Select @Sourcecoycode=Sender  From Trs_UnitAck1 Where Id=@Id  
SELECT @PartyId = 0   
SELECT @Ordid = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id    and transid = @TransID and StyleNo=@StyleNo 

 SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  and transid = @TransID and StyleNo=@StyleNo 

  SELECT @StageId = Trs_Pcs2.SourceStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId 
INNER JOIN Trs_Pcs2 ON Trs_Pcs1.Id = Trs_Pcs2.ID And Trs_Pcs2.StyleNo = Trs_UnitAck2.StyleNo And Trs_Pcs2.ColID = Trs_UnitAck2.ColID 
And Trs_Pcs2.SizeID = Trs_UnitAck2.SizeID and trs_Pcs2.PartID = Trs_UnitAck2.PartID And Trs_Pcs2.LotNo = Trs_UnitAck2.LotNo and trs_Pcs2.CompID = Trs_UnitAck2.CompID  Where Trs_UnitAck2.Id=@Id  and transid = @TransID 



 SELECT @StockQty = @Pcs  
 SELECT @GodId = GodId From Trs_UnitAck1 Where Id=@Id   
 Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId   SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id  

 

 SELECT @ProcessType = ProcessType From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id     and transid = @TransID and StyleNo=@StyleNo 
 /*
 SELECT @CompID = ISNull(CompId,0) From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id     and transid = @TransID and StyleNo=@StyleNo 
 */
 if ltrim(@LotNo)<>'' 
 SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  
 ELSE  
 SELECT @LotId = 0    
 begin   
 Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo 
and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  Inner Join Trs_UnitAck1 On Panel_StockTable.Coycode=Trs_UnitAck1.Coycode And Panel_StockTable.GodId=Trs_UnitAck1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId Inner Join Trs_UnitAck2 On Trs_UnitAck2.ID=Trs_UnitAck1.ID where Panel_StockTable.coycode=Trs_UnitAck1.Coycode and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid

=@StageId and Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@compId And Panel_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID And Trs_UnitAck2.TransID=@TransId   
end     
begin   
Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@Sourcecoycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  

/*
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  Inner Join Trs_UnitAck1 On Panel_StockTable.Coycode=Trs_UnitAck1.Sender And Panel_StockTable.GodId=Trs_UnitAck1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@compId Inner Join Trs_UnitAck2 On Trs_UnitAck2.ID=Trs_UnitAck1.ID where Panel_StockTable.coycode=Trs_UnitAck1.Sender and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid=@StageId and Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId And Panel_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID And Trs_UnitAck2.TransID=@TransId   */ end 
