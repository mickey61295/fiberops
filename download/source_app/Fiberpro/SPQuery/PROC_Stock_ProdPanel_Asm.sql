/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  17/08/2022 10.00 AM 
; =============================================  */  
 


CREATE PROCEDURE PROC_Stock_ProdPanel_Asm (@Id Int,@SizeId Int,@ProdPcs Int,@compID int) As DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int
,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int  ,@EntryOption int  ,@ComboID int   



Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id        



Select @PartyId = 0     



SELECT @Ordid = OrdId From Trs_AddPanelEntry Where Id=@Id



SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id      



SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id     



SELECT @SourceStageId = SourceStageId From Trs_AddPanelEntry Where Id=@Id     



SELECT @PartId = PartId From Trs_AddPanelEntry Where Id=@Id     



SELECT @GodId = GodId From Trs_AddPanelEntry Where Id=@Id     



SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@Id     



SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@Id     



SELECT @LotID = Isnull(LotID,0) From Trs_AddPanelEntry Where Id=@Id     



Select @SeqNo = SeqNo From Trs_AddPanelEntry Inner Join  Prod_Sequence On Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId Where Id=@Id     







SELECT @ComboID = ClrID From Trs_AddPanelEntry Where Id=@Id     



SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On  Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@Id     



SELECT @ColId = ClrId From Trs_AddPanelEntry Where Id=@Id      



SELECT @StockQty = @ProdPcs     



Select @EntryOption = EntryOption from OrderStyleDtl Where Ordid= @Ordid And StyleNo = @StyleNo        	



BEGIN   

print 'te'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty    From Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN Trs_AddPanelAsm_SourceDtl 
ON  Panel_StockTableQty.compID = Trs_AddPanelAsm_SourceDtl.compID And  Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId  

INNER JOIN Trs_AddPanelEntry ON Trs_AddPanelEntry.Id = Trs_AddPanelAsm_SourceDtl.ID And Trs_AddPanelEntry.Partid = Panel_StockTable.PartId

where Trs_AddPanelAsm_SourceDtl.ID = @Id And  coycode=@coycode and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotId = @LotId  and Panel_StockTable.GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.Colid = @ColId and  IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End     

 End 