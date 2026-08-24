/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  17/08/2022 10.00 AM 
; =============================================  */  
  
CREATE PROCEDURE PROC_Stock_ProdPanel_Delete1_ASM (@Id int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@ProdPcs Int,@sizeId int ,@LOTID int,@LotNo varchar(100)  Select @Id=@Id  
Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id  
select @PartyId = 0    
SELECT @Ordid = OrdId From Trs_AddPanelEntry Where Id=@Id  
SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id  
SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id  
SELECT @PartId = PartId From Trs_AddPanelEntry Where Id=@Id  
SELECT @GodId = GodId From Trs_AddPanelEntry Where Id=@Id    
SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@Id  
SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@Id    Select @SeqNo = SeqNo From Trs_AddPanelEntry Inner Join Prod_Sequence On Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId Where Id=@Id   
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@Id   
SELECT @ColId = ClrId From Trs_AddPanelEntry Where Id=@Id  
Select @SourceStageId=SourceStageId From Trs_AddPanelEntry Where Id=@Id  
SELECT @StockQty = @ProdPcs   
SELECT @LotNo = IsNull(LotNo,'0') From Trs_AddPanelEntry Where id=@Id  
if @LotNo<>'0'  
SELECT @LotID = IsNull(LotID,0) From Trs_AddPanelEntry Where Id=@Id  
else  
select @lotid=0  
begin  
DECLARE LINE_CURSOR CURSOR FOR 
Select Id,SizID,ProdPcs FROM Trs_AddPanelEntryQty Where ID=@Id   OPEN LINE_CURSOR FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs   
WHILE @@FETCH_STATUS = 0   
BEGIN   
 
 
  
If @StageId=1 And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' /* @SourceStageid<>0 And */    
Begin     
If EXISTS (select * from Panel_StockTable INNER JOIN Panel_StockTableQty ON Panel_StockTable.PcsStockId = Panel_StockTableQty.PcsStockId 
 INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId and  Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId
 and PartyId=@PartyId and LotId = @LotID )    
begin      
Select @PcsStockId=Panel_StockTable.PcsStockId From Panel_StockTable INNER JOIN Panel_StockTableQty ON Panel_StockTable.PcsStockId = Panel_StockTableQty.PcsStockId  INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId and Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo  and GodId=@GodId and PartyId=@PartyId and LotId = @LotID     

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId and Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.SizeId=@SizeId and LOTID = @LOTID and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)    

Begin     
UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+(@ProdPcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_AddPanelEntry On Panel_StockTable.Coycode=Trs_AddPanelEntry.CoyId And  Panel_StockTable.OrdId=Trs_AddPanelEntry.OrdId And Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo And Panel_StockTable.GodId=Trs_AddPanelEntry.GodId   INNER JOIN 
OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Panel_StockTableQty.Colid  And OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId And OrderQtyDtl.PartId = Panel_StockTable.PartID and 
OrderQtyDtl.lotno=@LotNo And Panel_StockTableQty.SizeId=@SizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End   INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId and Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId and Trs_AddPanelAsm_SourceDtl.id=@id WHERE Panel_StockTable
.coycode=Trs_AddPanelEntry.CoyId And Panel_StockTable.Ordid=Trs_AddPanelEntry.Ordid and Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo and Panel_StockTable.GodId=Trs_AddPanelEntry.GodId and Panel_StockTableQty.SizeId=@SizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case
 When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_AddPanelEntry.Id=@Id  and OrderQtyDtl.CmbClrID = @ColID and Panel_StockTable.LotID = @LotID 
End  

End    
 
End    
FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs   END  CLOSE LINE_CURSOR  DEALLOCATE LINE_CURSOR  SET NOCOUNT OFF   End 
